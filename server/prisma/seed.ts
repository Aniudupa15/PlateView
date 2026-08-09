import 'dotenv/config'
import { prisma } from '../src/db.js'
import { hashPassword } from '../src/auth.js'
import seedItems from './seed-data.json' with { type: 'json' }

async function main() {
  for (const item of seedItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    })
  }
  console.log(`Seeded ${seedItems.length} menu items.`)

  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin account creation.')
    return
  }

  const passwordHash = await hashPassword(password)
  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  })
  console.log(`Admin account ready for ${email}.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
