import { SignIn, SignUp } from '@clerk/react';
import { Activity } from 'lucide-react';

export function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-4 shadow-sm">
          <Activity size={24} strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">LeadForge</h1>
        <p className="text-muted-foreground text-sm mt-1">Disciplined acquisition workspace</p>
      </div>
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </div>
  );
}

export function SignUpPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-4 shadow-sm">
          <Activity size={24} strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">LeadForge</h1>
        <p className="text-muted-foreground text-sm mt-1">Disciplined acquisition workspace</p>
      </div>
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </div>
  );
}
