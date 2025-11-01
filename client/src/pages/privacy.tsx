import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="flex h-16 items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src="/favicon.png" alt="Babellion" className="h-8 w-8" />
            <span className="text-xl font-semibold">Babellion</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="container max-w-4xl py-12 px-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">
              Last updated: November 1, 2025
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Internal Use Only</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  This platform (<strong>Babellion</strong>, <strong>Cognitia</strong>, and <strong>ALICE</strong>) 
                  is an internal AI-powered tool developed and maintained exclusively for use by 
                  employees of <strong>IgniteTech</strong>, <strong>GFI Software</strong>, and <strong>Khoros</strong>.
                </p>
                <p>
                  These applications are not intended for public use and access is restricted to authorized personnel only.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Collection and Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  As internal tools, these platforms collect and process the following information:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>User authentication information via Google OAuth</li>
                  <li>Content and interaction history (translations, queries, conversations)</li>
                  <li>User preferences and settings</li>
                  <li>API keys (encrypted and stored securely)</li>
                </ul>
                <p className="mt-4">
                  All data is stored securely and is only accessible by authorized users within your organization.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  We implement industry-standard security measures to protect your data:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Encrypted storage for sensitive information including API keys</li>
                  <li>Secure authentication through Google OAuth</li>
                  <li>Role-based access control (admin and user roles)</li>
                  <li>Private translation option to restrict content visibility</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Third-Party Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  These platforms integrate with the following third-party services:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>OpenAI</strong> - For GPT-based AI models and processing</li>
                  <li><strong>Anthropic</strong> - For Claude-based AI models and processing</li>
                  <li><strong>Google</strong> - For authentication and document integration</li>
                </ul>
                <p className="mt-4">
                  Content is sent to these AI providers for processing. Please refer to their 
                  respective privacy policies for information on how they handle data.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Rights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  As an internal user, you have the right to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access your interaction history and data</li>
                  <li>Delete your content at any time</li>
                  <li>Control content visibility settings (where applicable)</li>
                  <li>Request data deletion by contacting your IT administrator</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  For questions or concerns about this privacy policy or these platforms, 
                  please contact your IT administrator or internal support team.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="px-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Babellion, Cognitia, and ALICE. For IgniteTech, GFI Software, and Khoros internal use only.</p>
        </div>
      </footer>
    </div>
  );
}

