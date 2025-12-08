export interface User {
    id: string;           // Unique identifier for the user (e.g., GUID or auto-incremented ID)
    email: string;        // User's email address (matches IdentityUser.Email)
    firstName: string;    // User's first name
    lastName: string;     // User's last name
    location: string;     // User's location
    role: string;         // User's role (e.g., Admin, User)
    createdAt?: Date;      // Timestamp when the user was created
    isDisabled: boolean;
  }
  export interface UserInfo {
  id: string;
  username: string;
  firstName: string;
  lastName?: string;
  role: string;
}