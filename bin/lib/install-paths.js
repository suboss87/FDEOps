// Installer destinations must be ordinary paths. Refuse links even with --force:
// permission to replace an installation is not permission to edit another tree.
const fs = require('fs')
const path = require('path')

function checkPath(target) {
  const absolute = path.resolve(target)
  const parts = absolute.slice(path.parse(absolute).root.length).split(path.sep)
  let current = path.parse(absolute).root
  for (const part of parts) {
    current = path.join(current, part)
    let stat
    try { stat = fs.lstatSync(current) } catch (e) {
      if (e.code === 'ENOENT') continue
      throw e
    }
    // macOS itself maps these root directories into /private. Permit only
    // those exact OS aliases, never arbitrary links below a client/install path.
    const systemAlias = stat.isSymbolicLink() && process.platform === 'darwin' &&
      ['/tmp', '/var'].includes(current) && fs.readlinkSync(current) === `private${current}`
    if (!systemAlias && (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile()) ||
        (stat.isFile() && stat.nlink > 1))) {
      const e = new Error(`refusing unsafe symlink or non-regular path: ${current}; use an ordinary destination path`)
      e.code = 'UNSAFE_PATH'
      e.path = current
      throw e
    }
  }
}

// Preflight a whole copied tree so a known bad nested destination cannot leave
// an existing skill half upgraded. Runtime I/O failures still surface normally.
function checkTree(src, dest) {
  checkPath(dest)
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const next = path.join(dest, entry.name)
    if (entry.isDirectory()) checkTree(path.join(src, entry.name), next)
    else checkPath(next)
  }
}
function mkdir(dest) {
  checkPath(dest)
  fs.mkdirSync(dest, { recursive: true })
}
function copyFile(src, dest) {
  checkPath(dest)
  fs.copyFileSync(src, dest)
}
function writeFile(dest, ...args) {
  checkPath(dest)
  fs.writeFileSync(dest, ...args)
}
module.exports = { checkPath, checkTree, mkdir, copyFile, writeFile }
