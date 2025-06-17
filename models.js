const PowerUsage = require('/project/Backend/src/models/power.usage.model');
// قائمة الـ ObjectIds الجديدة
const newIds = [
  ObjectId('681012e1204bd378a9b662b9'),
  ObjectId('684b8c461baef60e8cd4feb9'),
  ObjectId('684d792cdb174405a0dbaa05'),
  ObjectId('684d8653ad0d7be4ddb9f4b5'),
  ObjectId('684d87bc1baef60e8cd50249'),
  ObjectId('684f1bfbed3ebf9f31377d44'),
  ObjectId('684f1cbd5ed28858e599cf82'),
  ObjectId('684f1cf95be098f8c308bb19'),
  ObjectId('684f1d125be098f8c308bb1d'),
  ObjectId('684f1d2b5be098f8c308bb21'),
  ObjectId('684f1d615be098f8c308bb28'),
  ObjectId('684f1d755be098f8c308bb2c'),
];

// اجلب كل المستندات من المجموعة
const documents = PowerUsage.find().toArray();

// تحقق أن عدد المستندات أكثر من عدد الـ ObjectIds
if (documents.length > newIds.length) {
  print('Error: The number of documents exceeds the number of new ObjectIds.');
} else {
  // خلط (shuffle) قائمة الـ ObjectIds
  const shuffledIds = newIds.sort(() => 0.5 - Math.random());

  // توزيع الـ ObjectIds على المستندات
  documents.forEach((doc, index) => {
    const newId = shuffledIds[index % shuffledIds.length]; // توزيع عشوائي
    const oldId = doc._id;

    // تحديث المستند بـ ObjectId جديد
    db.myCollection.updateOne(
      { _id: oldId }, // الشرط
      { $set: { _id: newId } }, // استبدال _id بالـ ObjectId الجديد
    );

    print(`Updated document with old ID ${oldId} to new ID ${newId}`);
  });
}
