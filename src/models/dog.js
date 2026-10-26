function nextId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function createDog(input) {
  const now = new Date().toISOString();
  return {
    id: nextId("dog"),
    photo: input.photo || null,
    name: input.name.trim(),
    birthDate: input.birthDate,
    breed: input.breed.trim(),
    gender: input.gender,
    weight: input.weight ? Number(input.weight) : null,
    neutered: Boolean(input.neutered),
    ageEstimated: Boolean(input.ageEstimated), // 생일을 정확히 모르는 경우(프로필에 "추정"으로 표시)
    adoptionDate: input.adoptionDate || null,
    food: input.food?.trim() || "",
    allergies: input.allergies?.trim() || "",
    notes: input.notes?.trim() || "",
    createdAt: now,
    updatedAt: now,
  };
}

export function createScheduleItem(input) {
  return {
    id: input.id || nextId("sch"),
    dogId: input.dogId,
    ruleId: input.ruleId || null,
    title: input.title,
    description: input.description || "",
    date: input.date,
    category: input.category,
    suggestedTimes: input.suggestedTimes || [],
    completed: false,
  };
}
