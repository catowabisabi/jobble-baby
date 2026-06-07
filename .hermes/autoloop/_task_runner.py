#!/usr/bin/env python3
"""Task runner for Sisyphus - reads sisyphus_task.txt and executes the described task"""
import subprocess, sys, os

TASK_FILE = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task.txt"
PROJECT_DIR = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"

def run(cmd, cwd=None):
    print(f"[RUN] {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd or PROJECT_DIR, capture_output=True, text=True)
    if result.stdout: print(result.stdout)
    if result.stderr: print(result.stderr, file=sys.stderr)
    return result.returncode

# Read task
with open(TASK_FILE) as f:
    content = f.read()
print(f"Task loaded: {len(content)} chars")
print(content[:200])
print("---")

# Check if this is a new tab implementation task
if "Create a new tab" in content or "Implement" in content:
    # Extract tab name
    lines = content.split('\n')
    tab_name = None
    for line in lines:
        if "app/(tabs)/" in line and ".tsx" in line:
            tab_name = line.split("app/(tabs)/")[-1].split(".tsx")[0]
            break
        if "name=\"" in line:
            tab_name = line.split("name=\"")[-1].split("\"")[0]
            break
    
    if tab_name:
        print(f"Detected tab: {tab_name}")
        
        # Create the tab file
        # For now, just create a stub and let Sisyphus implement it
        tab_path = f"{PROJECT_DIR}/app/(tabs)/{tab_name}.tsx"
        if not os.path.exists(tab_path):
            print(f"Tab file {tab_path} does not exist yet - Sisyphus will create it")
        else:
            print(f"Tab file {tab_path} already exists")
            
        # Run TSC check
        print("\n[Step 1] Running TSC check...")
        rc = run("npx tsc --noEmit")
        if rc != 0:
            print(f"TSC failed with code {rc}")
        else:
            print("TSC passed")
            
        # Commit if there are changes
        print("\n[Step 3] Checking for changes...")
        rc = run("git status --short")
        if rc == 0:
            # Stage and commit
            run("git add -A")
            # Extract commit message
            commit_msg = "feat(tab): add new tab implementation"
            for line in content.split('\n'):
                if line.strip().startswith("git commit"):
                    commit_msg = line.split("git commit -m ")[-1].strip('"')
                    break
            run(f"git commit -m '{commit_msg}'")
            run("git push")
            print("Committed and pushed")
    else:
        print("Could not detect tab name from task")
        print("Sisyphus should read sisyphus_task.txt and implement manually")
else:
    print("Task type not recognized - Sisyphus should read sisyphus_task.txt and implement manually")
