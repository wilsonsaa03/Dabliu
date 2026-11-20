package co.dabliu.api.auth;

/** Reglas mínimas de contraseña. Se validan en el backend aunque el frontend también las muestre. */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 10;
    public static final int MAX_LENGTH = 128;

    private PasswordPolicy() {
    }

    public static void check(String password, String email) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw AuthException.weakPassword("La contraseña debe tener al menos " + MIN_LENGTH + " caracteres.");
        }
        if (password.length() > MAX_LENGTH) {
            throw AuthException.weakPassword("La contraseña no puede superar " + MAX_LENGTH + " caracteres.");
        }
        if (password.chars().noneMatch(Character::isLetter) || password.chars().noneMatch(Character::isDigit)) {
            throw AuthException.weakPassword("La contraseña debe combinar letras y números.");
        }
        if (email != null && password.equalsIgnoreCase(email)) {
            throw AuthException.weakPassword("La contraseña no puede ser igual a tu correo.");
        }
    }
}
