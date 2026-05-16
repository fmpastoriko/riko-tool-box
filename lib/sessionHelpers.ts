export function attachIsOwn<T extends { hashed_ip?: string | null }>(
  rows: T[],
  owner: boolean,
  hashedIp: string,
): (T & { is_own: boolean })[] {
  return rows.map((row) => ({
    ...row,
    is_own: owner || row.hashed_ip === hashedIp,
  }));
}

export function filterOwnerRows<T extends { user_id?: string | null }>(
  rows: (T & { is_own: boolean })[],
  owner: boolean,
  ownerUserId: string | null,
): (T & { is_own: boolean })[] {
  return rows.filter((row) => {
    if (owner) return true;
    if (ownerUserId && row.user_id === ownerUserId) return false;
    return true;
  });
}
