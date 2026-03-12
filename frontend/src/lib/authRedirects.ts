const getConfiguredRedirectUrl = (value: string | undefined) => {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : undefined;
};

const getDeployedAppUrl = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const basePath = import.meta.env.BASE_URL || '/';

  return new URL(basePath, window.location.origin).toString();
};

export const getPasswordResetRedirectUrl = () =>
  getConfiguredRedirectUrl(import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL) || getDeployedAppUrl();

export const getEmailChangeRedirectUrl = () =>
  getConfiguredRedirectUrl(import.meta.env.VITE_EMAIL_CHANGE_REDIRECT_URL) || getDeployedAppUrl();

export const getMfaEmailRedirectUrl = () =>
  getConfiguredRedirectUrl(import.meta.env.VITE_MFA_EMAIL_REDIRECT_URL) ||
  getConfiguredRedirectUrl(import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL) ||
  getDeployedAppUrl();