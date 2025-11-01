import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
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
            <h1 className="text-4xl font-bold mb-4">Terms and Conditions</h1>
            <p className="text-muted-foreground">
              Last updated: November 1, 2025
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Internal Use Agreement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  These platforms (<strong>Babellion</strong>, <strong>Cognitia</strong>, and <strong>ALICE</strong>) 
                  are internal AI-powered tools developed and maintained exclusively for use by 
                  employees of <strong>IgniteTech</strong>, <strong>GFI Software</strong>, and <strong>Khoros</strong>.
                </p>
                <p>
                  By accessing and using these platforms, you acknowledge that:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>You are an authorized employee of IgniteTech, GFI Software, or Khoros</li>
                  <li>You will use these platforms solely for business purposes</li>
                  <li>These platforms are not available for public or external use</li>
                  <li>Access may be revoked at any time without notice</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Acceptable Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Users of these platforms agree to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Use the platforms only for legitimate business needs</li>
                  <li>Not share access credentials with unauthorized individuals</li>
                  <li>Handle sensitive or confidential content appropriately</li>
                  <li>Use privacy settings for confidential content (where applicable)</li>
                  <li>Not attempt to circumvent security measures or access controls</li>
                  <li>Comply with all applicable company policies and regulations</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content and Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  All content created within these platforms:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Remains the property of your employing organization (IgniteTech, GFI Software, or Khoros)</li>
                  <li>May be reviewed by administrators for compliance and quality purposes</li>
                  <li>Is subject to company data retention and deletion policies</li>
                  <li>Public content may be visible to authorized users within your organization (where applicable)</li>
                  <li>Private content is visible only to you and administrators (where applicable)</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Third-Party AI Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  These platforms utilize third-party AI services (OpenAI, Anthropic) for content processing. By using these platforms:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>You acknowledge that content is sent to these AI providers for processing</li>
                  <li>You should not include highly sensitive or proprietary information without proper authorization</li>
                  <li>You understand these services operate under their own terms and privacy policies</li>
                  <li>Your organization maintains API keys and controls access to these services</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Roles and Permissions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  These platforms typically have two user roles:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Users</strong> - Can create, edit, and delete their own content</li>
                  <li><strong>Administrators</strong> - Have full access to manage users, settings, and platform configuration</li>
                </ul>
                <p className="mt-4">
                  Administrators cannot access or modify private content of other users (where applicable), ensuring confidentiality when needed.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  While we strive to maintain high availability:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>These platforms may experience downtime for maintenance or updates</li>
                  <li>Service availability is not guaranteed and may be interrupted</li>
                  <li>We are not liable for any loss of data or business impact due to service disruptions</li>
                  <li>Users should maintain backup copies of critical content</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  These platforms are provided as internal tools "as is" without warranties of any kind. 
                  Users are responsible for:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Verifying the accuracy and quality of AI-generated content</li>
                  <li>Ensuring outputs meet their specific business needs</li>
                  <li>Reviewing and editing AI-generated content before use</li>
                  <li>Complying with all applicable laws and regulations</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Changes to Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  These terms and conditions may be updated at any time. Continued use of these platforms 
                  constitutes acceptance of any changes. Users will be notified of significant changes 
                  through internal communication channels.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact and Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  For questions, support requests, or concerns regarding these terms, please contact 
                  your IT administrator or internal support team.
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

