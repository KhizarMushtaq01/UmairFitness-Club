import { db } from "../src/lib/db";
import { hashPassword } from "better-auth/crypto";

async function main() {
  const pw = await hashPassword("password123");

  const admin = await db.user.create({
    data: { email: "danny@umairfitness.gym", name: "Danny Okafor", role: "ADMIN", emailVerified: true,
      accounts: { create: { providerId: "credential", accountId: "danny@umairfitness.gym", password: pw } } },
  });
  const trainer = await db.user.create({
    data: { email: "ana@umairfitness.gym", name: "Ana Silva", role: "TRAINER", emailVerified: true,
      accounts: { create: { providerId: "credential", accountId: "ana@umairfitness.gym", password: pw } } },
  });
  const member = await db.user.create({
    data: { email: "marcus@umairfitness.gym", name: "Marcus Reid", role: "MEMBER", emailVerified: true,
      accounts: { create: { providerId: "credential", accountId: "marcus@umairfitness.gym", password: pw } } },
  });

  await db.membership.create({
    data: { userId: member.id, plan: "FIGHTER", status: "ACTIVE", renewsAt: new Date("2026-09-01") },
  });

  const boxingClass = await db.class.create({
    data: { discipline: "Boxing", title: "Boxing — Advanced", coachId: trainer.id, room: "Ring 1",
      capacity: 16, startsAt: new Date("2026-08-08T18:30:00"), durationMin: 60 },
  });
  const muayThai = await db.class.create({
    data: { discipline: "Muay Thai", title: "Muay Thai", coachId: trainer.id, room: "Ring 2",
      capacity: 14, startsAt: new Date("2026-08-08T12:15:00"), durationMin: 60 },
  });

  await db.booking.createMany({
    data: [
      { userId: member.id, classId: boxingClass.id, status: "CONFIRMED" },
      { userId: member.id, classId: muayThai.id, status: "CONFIRMED" },
    ],
  });

  const program = await db.workoutProgram.create({
    data: {
      coachId: trainer.id, name: "STRENGTH BLOCK C", weeks: 8,
      days: {
        create: [
          { dayIndex: 1, focus: "Max strength", exercises: { create: [
            { name: "Back squat", sets: "5 × 3", load: "142.5 kg", tempo: "31X1" },
            { name: "Romanian deadlift", sets: "4 × 6", load: "110 kg", tempo: "3010" },
          ] } },
          { dayIndex: 2, focus: "Power + pull", exercises: { create: [
            { name: "Bench press", sets: "5 × 3", load: "102.5 kg", tempo: "21X1" },
            { name: "Weighted pull-up", sets: "4 × 5", load: "+20 kg", tempo: "2011" },
          ] } },
        ],
      },
    },
  });
  await db.programAssignment.create({
    data: { programId: program.id, memberId: member.id, adherencePct: 92 },
  });

  const nutrition = await db.nutritionPlan.create({
    data: { memberId: member.id, coachId: trainer.id, kcal: 2450, protein: 190, carbs: 260, fat: 75,
      meals: { create: [
        { time: "07:30", name: "Breakfast", detail: "Oats, whey, blueberries, almonds", kcal: 580 },
        { time: "12:30", name: "Lunch", detail: "Chicken thigh, jasmine rice, greens", kcal: 640 },
      ] } },
  });
  void nutrition;

  await db.invoice.createMany({
    data: [
      { userId: member.id, desc: "Fighter plan — July", amount: 14900, status: "PAID", issuedAt: new Date("2026-07-01") },
      { userId: member.id, desc: "Umair Fitness Club wraps + gloves", amount: 16400, status: "REFUNDED", issuedAt: new Date("2026-04-22") },
    ],
  });

  const gloves = await db.product.create({ data: { name: "UFC Pro leather gloves — 14oz", price: 12000, stock: 34, category: "Gear" } });
  await db.product.createMany({
    data: [
      { name: "Competition hand wraps 4.5m", price: 1800, stock: 210, category: "Gear" },
      { name: "Isolate whey — 2kg", price: 6800, stock: 48, category: "Supps" },
    ],
  });
  const order = await db.order.create({ data: { userId: member.id, status: "SHIPPED" } });
  await db.orderItem.create({ data: { orderId: order.id, productId: gloves.id, qty: 1 } });

  await db.post.createMany({
    data: [
      { title: "Inside an 8-week fight camp", tag: "Fight camp", status: "PUBLISHED", views: 4200, authorId: admin.id },
      { title: "Making weight without losing your mind", tag: "Nutrition", status: "DRAFT", views: 0, authorId: admin.id },
    ],
  });

  await db.galleryImage.createMany({
    data: [
      { url: "/uploads/pasted-1783022551988-0.png", caption: "Floor session" },
    ],
  });

  await db.notification.create({
    data: { userId: member.id, title: "Sparring Lab approval", body: "Coach Silva approved you for technical sparring." },
  });

  await db.attendanceLog.create({ data: { userId: member.id } });

  console.log("Seed complete:", { admin: admin.email, trainer: trainer.email, member: member.email });
}

main().finally(() => db.$disconnect());
