'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';



import { LoaderIcon } from '@/components/icons';
import { register, type RegisterActionState } from '../actions';
import { toast } from '@/components/toast';
import { useSession } from 'next-auth/react';


import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


export default function Page() {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState<RegisterActionState, FormData>(
    register,
    {
      status: 'idle',
    },
  );

  const { update: updateSession } = useSession();

  useEffect(() => {
    if (state.status === 'user_exists') {
      toast({ type: 'error', description: 'Account already exists!' });
    } else if (state.status === 'failed') {
      toast({ type: 'error', description: 'Failed to create account!' });
    } else if (state.status === 'invalid_data') {
      toast({
        type: 'error',
        description: 'Failed validating your submission!',
      });
    } else if (state.status === 'success') {
      toast({ type: 'success', description: 'Account created successfully!' });
      updateSession();
      router.refresh();
    }
  }, [state]);

  const handleSubmit = (formData: FormData) => {
    formAction(formData);
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
    <div className="w-full max-w-sm">
    <Card>
            <CardHeader>
              <CardTitle>Sign up your account</CardTitle>
              <CardDescription>
                Enter your email below to sign up to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={handleSubmit} >
                <div className="flex flex-col gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      placeholder="m@example.com"
                      autoComplete="email"
                      autoFocus
                      required
                    />
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                    
                    </div>
                    <Input 
                    id="password" 
                    type="password" 
                    name="password" 
                    autoComplete="password"
                    required 
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button type="submit" className="w-full" disabled={isPending}>
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          Signing up...
                          <span className="animate-spin absolute right-4">
                            <LoaderIcon />
                          </span>
                        </div>
                      ) : (
                        'Sign Up'
                      )}
                    </Button>
                
                  </div>
                </div>
                <div className="mt-4 text-center text-sm">
                <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {'Already have an account? '}
            <Link
              href="/login"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Sign in
            </Link>
            {' instead.'}
          </p>
                </div>
              </form>
            </CardContent>
          </Card>
           </div>
        </div>
      )
}
