let saveToken = (token, role) => {
    if (!token || !role) {
        throw new Error('Token and role are required');
    }
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
}

let logOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role'); // Nettoyage cohérent
}

let logged = () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    // Validation basique
    return !!(token && role && isValidToken(token));
}

// Ajouter une validation du token
const isValidToken = (token) => {
    // Vérifier la structure basique
    return typeof token === 'string' && token.length > 10;
}

// Ajouter une méthode pour récupérer le rôle
let getRole = () => {
    return localStorage.getItem('role');
}
let getToken = () =>{
    return localStorage.getItem('token');
}

export const accountService = { saveToken, logOut, logged, getRole,getToken };