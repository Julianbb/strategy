import { tool } from 'ai';
import { z } from 'zod';

import {getUser, createUser} from "@/lib/db/queries"

const getUserbyEmail = tool({
    description: 'get user by email',
    parameters: z.object({
      email: z.string().email()
    }),
    execute: async ({ email }) => {
      const user = await getUser(email);
      if (user.length === 0) {
        return {
          error: 'User not found'
        }
      } else {
        return user[0]
      }
    },
  });
  

  const createUserbyEmailandPassword = tool({
    description: 'create user by email and password',
    parameters: z.object({
      email: z.string().email(),
      password: z.string(),
    }),
    execute: async ({ email, password }) => {
      const user = await createUser(email, password);
      return user;
    },
  });
  

  export {getUserbyEmail, createUserbyEmailandPassword}