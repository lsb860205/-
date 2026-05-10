
export const getProjectSlug = (clientName: string) => {
  return clientName
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣-]/g, '');
};
