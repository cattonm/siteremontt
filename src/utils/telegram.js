export const tg = window.Telegram?.WebApp || null;

export const vibe = (type = 'light') => {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(type);
};

export const vibeSelect = () => {
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
};

export const vibeError = () => {
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
};