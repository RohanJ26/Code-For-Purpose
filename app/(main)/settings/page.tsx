'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bell, Lock, User, Database, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [settings, setSettings] = useState({
    apiKey: 'sk_test_••••••••••••••••',
    notifications: true,
    autoAnalysis: true,
    dataRetention: '30',
  });

  const handleSave = () => {
    console.log('Settings saved:', settings);
  };

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Configure your DataMind account and preferences</p>
        </div>

        <Card className="p-6 border border-border space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Account</h2>
            </div>

            <div className="space-y-4 ml-8">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                <Input type="email" defaultValue="user@example.com" className="rounded-lg" disabled />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Display Name</label>
                <Input defaultValue="John Analyst" className="rounded-lg" />
              </div>

              <Button size="sm" className="rounded-full">
                Update Profile
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">API Keys</h2>
            </div>

            <div className="space-y-4 ml-8">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">API Key</label>
                <div className="flex gap-2">
                  <Input type={showApiKey ? 'text' : 'password'} value={settings.apiKey} className="rounded-lg" readOnly />
                  <Button onClick={() => setShowApiKey(!showApiKey)} size="icon" variant="outline" className="rounded-lg">
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Use this key to authenticate with the API</p>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-full">
                  Copy Key
                </Button>
                <Button size="sm" variant="destructive" className="rounded-full">
                  Regenerate
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Data Management</h2>
            </div>

            <div className="space-y-4 ml-8">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Data Retention Policy</label>
                <select
                  value={settings.dataRetention}
                  onChange={(e) => setSettings({ ...settings, dataRetention: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                >
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                  <option value="never">Never delete</option>
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  Automatically delete old datasets after the selected period
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-foreground">Storage Usage</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">2.4 GB used</span>
                    <span className="text-muted-foreground">10 GB available</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-full rounded-full" style={{ width: '24%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
            </div>

            <div className="space-y-4 ml-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive alerts for important events</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                  className="w-5 h-5 rounded border-border cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Auto-Analysis Reports</p>
                  <p className="text-sm text-muted-foreground">Automatically analyze datasets on upload</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoAnalysis}
                  onChange={(e) => setSettings({ ...settings, autoAnalysis: e.target.checked })}
                  className="w-5 h-5 rounded border-border cursor-pointer"
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSave} className="rounded-full">
            Save Changes
          </Button>
          <Button variant="outline" className="rounded-full">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
