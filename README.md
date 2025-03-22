# This is the Full-Stack project repo for 'Project Mate'

### Git Workflow

- Fetch latest updates `git fetch`
- Be on development branch. `git checkout develop`
- Pull in latest development changes `git pull`, if has problem do: `git reset --hard develop` this will reset ur current codebase to be exactly like remote develop branch
- Create new branch for ur fix/feat `git checkout -b amaan/feat/smth`
- Make changes, and make sure to add commits everytime something small is fixed or changed or added `git add .`, `git commit -m 'Amaan - added new xyz component'`
- After successfully completing a feature, you want to make a pr right, so first make sure you don't have conflict, by rebasing with latest remote changes. `git pull --rebase origin develop`. then if everything is fine, push your latest changes to your remote branch `git push -u origin amaan/feat/smth`.
- If theres conflict while rebasing, fix conflict then do `git add .` and then `git rebase --continue` until all conflict is resolved. and continue with your puush
- After successful push, make pr from your branch to be merged with develop branch. and document the pr very well.
- After your pr gets merged, again repeat from the top of this flow.
