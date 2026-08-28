import os
import subprocess

repos = [
    ('/home/aewoodyard/repos/aegis-pod-bot', 'apps/discord-bot', 'main'),
    ('/home/aewoodyard/repos/ss-aegis-os-space', 'web/portal', 'main'),
]

for repo_path, subfolder, default_branch in repos:
    if not os.path.exists(repo_path):
        continue
    readme_path = os.path.join(repo_path, 'README.md')
    banner = f'''# DEPRECATED

> [!WARNING]
> ### ⚠️ REPOSITORY CONSOLIDATED & DEPRECATED
> This repository has been consolidated into the unified [**`aegis-console`**](https://github.com/woodyardae/aegis-os) monorepo under `{subfolder}`.
> All active development, issues, and PRs now occur in **`aegis-console`**. This standalone repository is archived and read-only.

'''
    content = ""
    if os.path.exists(readme_path):
        with open(readme_path, 'r', encoding='utf-8') as f:
            content = f.read()
    if 'REPOSITORY CONSOLIDATED' not in content:
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(banner + content)
        subprocess.run(['git', '-C', repo_path, 'add', 'README.md'], check=True)
        subprocess.run(['git', '-C', repo_path, 'commit', '-m', f'chore: deprecate standalone repository in favor of aegis-console ({subfolder})'], check=True)
        try:
            subprocess.run(['git', '-C', repo_path, 'push', 'origin', default_branch], check=True)
            print(f"Pushed deprecation for {repo_path}")
        except Exception as e:
            print(f"Failed to push {repo_path}: {e}")
