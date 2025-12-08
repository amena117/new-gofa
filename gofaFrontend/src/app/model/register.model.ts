export interface RegisterModel {
    email: string;       // User's email address (matches IdentityUser.Email)
    password: string;    // User's password (will be hashed on the backend)
    firstName: string;   // User's first name
    lastName: string;    // User's last name
    location: string;    // User's location
  }