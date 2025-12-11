const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function getData() {
  try {
    const school = await prisma.school.findFirst();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true
      },
      take: 5
    });

    console.log('\n=== SCHOOL ===');
    console.log(JSON.stringify(school, null, 2));
    console.log('\n=== USERS ===');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getData();
