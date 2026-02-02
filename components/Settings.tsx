import { Settings as SettingsIcon, LogOut, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface SettingsProps {
  userEmail?: string | null;
  onSignOut?: () => void;
}

const Settings = ({ userEmail, onSignOut }: SettingsProps) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {userEmail && (
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Signed in as</span>
              <span className="text-sm font-medium">{userEmail}</span>
            </div>
          )}
          {onSignOut && (
            <Button
              variant="outline"
              onClick={onSignOut}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Placeholder for future settings */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <SettingsIcon className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">More settings coming soon</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            Additional customization options will be available in future updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
