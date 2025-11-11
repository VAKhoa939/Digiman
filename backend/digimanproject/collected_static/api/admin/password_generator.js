document.addEventListener("DOMContentLoaded", function () {
    const generatePasswordButton = document.getElementById("generate-password");
    const passwordField = document.getElementById("id_password");

    if (generatePasswordButton && passwordField) {
        generatePasswordButton.addEventListener("click", function () {
            const password = Array.from({ length: 12 }, () =>
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()".charAt(
                    Math.floor(Math.random() * 72)
                )
            ).join("");
            passwordField.value = password;
            alert("Generated password: " + password);
        });
    }
});