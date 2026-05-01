const USERNAME_KEY = "studyflow.username";

export function getStoredUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY);
}

export function setStoredUsername(username: string): void {
  localStorage.setItem(USERNAME_KEY, username);
}

export function clearStoredUsername(): void {
  localStorage.removeItem(USERNAME_KEY);
}
