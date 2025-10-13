/**
 * Primus IDE - Professional Development Environment
 * 
 * This is a demo TypeScript file to showcase the IDE's capabilities:
 * - Syntax highlighting
 * - IntelliSense and code completion
 * - Error detection
 * - Multi-language support
 * - Professional editing experience
 */

interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

class UserManager {
  private users: User[] = [];

  constructor() {
    console.log('UserManager initialized');
  }

  /**
   * Add a new user to the system
   * @param user User object to add
   * @returns Success status
   */
  addUser(user: User): boolean {
    try {
      // Validate user data
      if (!user.name || !user.email) {
        throw new Error('Name and email are required');
      }

      // Check for duplicate email
      const existingUser = this.users.find(u => u.email === user.email);
      if (existingUser) {
        console.warn(`User with email ${user.email} already exists`);
        return false;
      }

      // Add user
      this.users.push(user);
      console.log(`User ${user.name} added successfully`);
      return true;
    } catch (error) {
      console.error('Failed to add user:', error);
      return false;
    }
  }

  /**
   * Get all active users
   * @returns Array of active users
   */
  getActiveUsers(): User[] {
    return this.users.filter(user => user.isActive);
  }

  /**
   * Find user by ID
   * @param id User ID to search for
   * @returns User object or undefined
   */
  findUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  /**
   * Update user status
   * @param userId User ID
   * @param isActive New active status
   */
  updateUserStatus(userId: number, isActive: boolean): void {
    const user = this.findUserById(userId);
    if (user) {
      user.isActive = isActive;
      console.log(`User ${user.name} status updated to ${isActive ? 'active' : 'inactive'}`);
    } else {
      console.warn(`User with ID ${userId} not found`);
    }
  }

  /**
   * Get user statistics
   */
  getStatistics() {
    const totalUsers = this.users.length;
    const activeUsers = this.getActiveUsers().length;
    const inactiveUsers = totalUsers - activeUsers;

    return {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      activePercentage: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0
    };
  }
}

// Example usage
const userManager = new UserManager();

// Add some demo users
const demoUsers: User[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', isActive: true },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', isActive: true },
  { id: 3, name: 'Carol White', email: 'carol@example.com', isActive: false },
  { id: 4, name: 'David Brown', email: 'david@example.com', isActive: true }
];

demoUsers.forEach(user => {
  userManager.addUser(user);
});

// Display statistics
const stats = userManager.getStatistics();
console.log('User Statistics:', stats);

// Find and update a user
const user = userManager.findUserById(3);
if (user) {
  console.log(`Found user: ${user.name}`);
  userManager.updateUserStatus(3, true);
}

// Export for use in other modules
export { UserManager, User };

// This file demonstrates:
// ✅ TypeScript syntax highlighting
// ✅ Interface and class definitions
// ✅ Method documentation with JSDoc
// ✅ Error handling and logging
// ✅ Complex data structures
// ✅ Modern JavaScript features
// ✅ Export/import syntax
// ✅ Professional code organization
