const terminalErrorActions: Record<string, string> = {
    TERMINAL_CLIENT_TYPE_REQUIRED: 'This login is missing its client type header. Update the app and try again.',
    TERMINAL_ID_REQUIRED: 'Open EXE Terminal Setup and register this counter before logging in.',
    TERMINAL_INSTALLATION_REQUIRED: 'Restore or create this EXE installation ID, then try again.',
    TERMINAL_ALREADY_REGISTERED: 'Ask an admin to reset the old terminal registration before continuing.',
    TERMINAL_INSTALLATION_CONFLICT: 'This installation belongs to another till. Ask an admin to correct the mapping.',
    TERMINAL_INSTALLATION_MISMATCH:
        'Terminal setup does not match this installation. Ask an admin to correct it; do not re-register automatically.',
    TERMINAL_MAPPING_CONFLICT: 'Ask an admin to correct the duplicate or missing till mapping.',
    TERMINAL_ASSIGNMENT_AMBIGUOUS: 'Ask an admin to correct the cashier assignment or current roster.',
    TERMINAL_NOT_ASSIGNED: 'POS access is blocked. Ask an admin to assign this cashier to a till.',
    TERMINAL_NOT_AUTHORISED: "POS access is blocked. Ask an admin to correct this user's till access.",
};

export function getTerminalErrorMessage(value: unknown, fallback = 'Terminal operation failed.'): string {
    if (typeof value !== 'string' || !value.trim()) return fallback;
    const message = value.trim();
    return terminalErrorActions[message] || message;
}
