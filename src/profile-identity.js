// Match native ProfileRecord identity by execution fields, as in This Cup.
const fields = ['version','beverage_type','steps','tank_temperature','target_weight','target_volume','target_volume_count_start'];
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export function profileExecutionKey(profile) {
  if (!Array.isArray(profile?.steps) || !profile.steps.length) return null;
  return JSON.stringify(canonical(Object.fromEntries(fields.map(key => [key, profile[key] ?? null]))));
}
export function resolveProfileIdentity(profile, entries, binding) {
  const key = profileExecutionKey(profile);
  if (!key) return null;
  if (binding?.execution === key && entries.some(entry => entry.id === binding.id)) return binding.id;
  const matches = entries.filter(entry => typeof entry.id === 'string' && profileExecutionKey(entry.profile) === key);
  return matches.length === 1 ? matches[0].id : null;
}
