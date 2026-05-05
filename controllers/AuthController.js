class AuthController {
    verifyExit(password) {
        // La contraseña para salir del examen es 1234
        return password === '1234';
    }
}

module.exports = AuthController;