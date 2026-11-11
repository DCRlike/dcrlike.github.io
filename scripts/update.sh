#!/usr/bin/env bash
set -euo pipefail

repo="DCRlike/dcrlike.github.io"
workflow="deploy.yml"

for command in git gh; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf '错误：请先安装 %s。\n' "$command" >&2
    exit 1
  fi
done

if [[ "$(git branch --show-current)" != "main" ]]; then
  printf '错误：请切换到 main 分支后再运行，此分支才会触发部署。\n' >&2
  exit 1
fi

origin_url="$(git remote get-url origin)"
case "$origin_url" in
  https://github.com/DCRlike/dcrlike.github.io|https://github.com/DCRlike/dcrlike.github.io.git|git@github.com:DCRlike/dcrlike.github.io|git@github.com:DCRlike/dcrlike.github.io.git|ssh://git@github.com/DCRlike/dcrlike.github.io|ssh://git@github.com/DCRlike/dcrlike.github.io.git) ;;
  *) printf '错误：origin 不是预期的博客仓库：%s\n' "$origin_url" >&2; exit 1 ;;
esac

gh auth status >/dev/null
remote_sha="$(git ls-remote --heads origin refs/heads/main | cut -f1)"
printf '\n添加改动…\n'
git add -A
if ! git diff --cached --quiet; then
  message="${*:-更新博客 $(date '+%Y-%m-%d %H:%M:%S')}"
  printf '\n创建提交：%s\n' "$message"
  git commit -m "$message"
else
  printf '没有新的文件改动，检查是否有待推送的提交。\n'
fi

commit_sha="$(git rev-parse HEAD)"
if [[ "$commit_sha" == "$remote_sha" ]]; then
  printf '博客已是最新版本，没有新的部署需要跟踪。\n'
  exit 0
fi

printf '\n推送到 GitHub…\n'
git push origin HEAD:main
printf '\n等待 GitHub 创建部署任务…\n'
run_id=""
for ((attempt = 1; attempt <= 24; attempt++)); do
  run_id="$(gh run list --repo "$repo" --workflow "$workflow" --event push --commit "$commit_sha" --limit 1 --json databaseId --jq '.[0].databaseId // empty')"
  if [[ -n "$run_id" ]]; then
    break
  fi
  sleep 5
done

if [[ -z "$run_id" ]]; then
  printf '未能在两分钟内找到本次部署任务。请查看 https://github.com/%s/actions\n' "$repo" >&2
  exit 1
fi

printf '\n正在跟踪部署任务 %s：\n' "$run_id"
gh run watch "$run_id" --repo "$repo" --exit-status
printf '\n部署成功：https://dcrlike.github.io/\n'
