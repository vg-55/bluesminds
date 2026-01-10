#!/usr/bin/env node
/**
 * Add dynamic export to all admin routes
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const adminDir = 'app/api/admin'
const dirs = readdirSync(adminDir)

let fixed = 0

for (const dir of dirs) {
  const routeFile = join(adminDir, dir, 'route.ts')

  try {
    const content = readFileSync(routeFile, 'utf8')

    // Skip if already has dynamic export
    if (content.includes('export const dynamic')) {
      console.log(`✓ ${routeFile} - already has dynamic export`)
      continue
    }

    // Find the end of imports (first empty line after imports)
    const lines = content.split('\n')
    let insertIndex = -1
    let inImports = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (line.startsWith('import ')) {
        inImports = true
      } else if (inImports && line === '') {
        insertIndex = i
        break
      }
    }

    if (insertIndex === -1) {
      console.log(`⚠ ${routeFile} - couldn't find import section`)
      continue
    }

    // Insert the dynamic export
    lines.splice(insertIndex + 1, 0, '// Force dynamic rendering')
    lines.splice(insertIndex + 2, 0, "export const dynamic = 'force-dynamic'")
    lines.splice(insertIndex + 3, 0, '')

    writeFileSync(routeFile, lines.join('\n'), 'utf8')
    console.log(`✅ ${routeFile} - added dynamic export`)
    fixed++
  } catch (err) {
    // File doesn't exist, skip
  }
}

console.log(`\nFixed ${fixed} files`)
