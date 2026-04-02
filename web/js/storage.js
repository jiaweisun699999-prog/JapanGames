const KEY = "kanto-leisure-save-v1";

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const data = JSON.parse(raw);
    return { ...defaultSave(), ...data, stamps: { ...defaultSave().stamps, ...(data.stamps || {}) } };
  } catch {
    return defaultSave();
  }
}

function defaultSave() {
  return {
    stamps: {
      L01: false,
      L02: false,
      L03: false,
      L04: false,
      L05: false,
    },
    soundOn: true,
  };
}

export function writeSave(patch) {
  const next = { ...loadSave(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function unlockStamp(levelId) {
  const s = loadSave();
  s.stamps[levelId] = true;
  writeSave({ stamps: s.stamps });
}
