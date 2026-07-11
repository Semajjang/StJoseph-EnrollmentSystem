import { useEffect, useState } from 'react';
import { CheckCircle2Icon, TriangleAlertIcon } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Field,
  Input,
  PageHeader,
  useToast,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  }, [user?.email, user?.name, user?.phone]);

  const handleSaveProfile = async () => {
    setProfileMessage(null);
    setProfileError(null);

    const nextName = profileForm.name.trim();
    const nextEmail = profileForm.email.trim().toLowerCase();
    const nextPhone = profileForm.phone.trim();

    if (!nextName) {
      setProfileError('Full name is required.');
      return;
    }

    if (!nextEmail) {
      setProfileError('Email is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setProfileError('Enter a valid email address.');
      return;
    }

    if (nextPhone && !/^09\d{9}$/.test(nextPhone)) {
      setProfileError('Phone number must use 11 digits starting with 09.');
      return;
    }

    setIsSavingProfile(true);

    const { error, message } = await updateProfile({
      name: nextName,
      email: nextEmail,
      phone: nextPhone,
    });

    setIsSavingProfile(false);

    if (error) {
      setProfileError(error);
      return;
    }

    const successMessage = message || 'Profile updated successfully.';
    setProfileMessage(successMessage);
    toast.success('Profile saved', successMessage);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 md:p-8">
      <PageHeader
        eyebrow="Profile"
        title="Edit profile"
        description="Update the account name, email, and phone number used across the portal."
      />

      <Card padding="none" className="animate-fade-up">
        <CardHeader
          title={
            <span className="flex items-center gap-3">
              <Avatar name={user?.name || 'Account'} />
              <span className="min-w-0">
                <span className="block truncate">{user?.name || 'Your account'}</span>
                <span className="block truncate text-sm font-normal text-muted">{user?.email}</span>
              </span>
            </span>
          }
          actions={<Badge tone="brand" className="capitalize">{user?.role || 'guardian'}</Badge>}
        />
        <CardBody className="space-y-4">
          <Field label="Full name" required>
            {({ id }) => (
              <Input
                id={id}
                value={profileForm.name}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Enter your full name"
              />
            )}
          </Field>

          <Field label="Email address" required hint="Changing your email requires confirming it from your inbox.">
            {({ id }) => (
              <Input
                id={id}
                type="email"
                value={profileForm.email}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="name@example.com"
              />
            )}
          </Field>

          <Field label="Phone number" hint="Optional. 11 digits starting with 09.">
            {({ id }) => (
              <Input
                id={id}
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={profileForm.phone}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    phone: event.target.value.replace(/\D/g, '').slice(0, 11),
                  }))
                }
                placeholder="09XXXXXXXXX"
              />
            )}
          </Field>

          {profileError ? (
            <p className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
              <TriangleAlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {profileError}
            </p>
          ) : null}
          {profileMessage ? (
            <p className="flex items-start gap-2 rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm font-medium text-success">
              <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0" />
              {profileMessage}
            </p>
          ) : null}
        </CardBody>
        <CardFooter>
          <Button onClick={() => void handleSaveProfile()} isLoading={isSavingProfile}>
            {isSavingProfile ? 'Saving…' : 'Save profile'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
