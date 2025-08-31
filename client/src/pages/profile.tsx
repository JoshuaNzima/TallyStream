import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Settings, Key, Shield, Mail, Phone, CheckCircle, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().min(1, "Phone number is required").optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const verificationSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

type ProfileData = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;
type VerificationData = z.infer<typeof verificationSchema>;

export default function Profile() {
  const { toast } = useToast();
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [phoneVerificationSent, setPhoneVerificationSent] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: (currentUser as any)?.firstName || "",
      lastName: (currentUser as any)?.lastName || "",
      email: (currentUser as any)?.email || "",
      phone: (currentUser as any)?.phone || "",
    },
  });

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const emailVerificationForm = useForm<VerificationData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: { code: "" },
  });

  const phoneVerificationForm = useForm<VerificationData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: { code: "" },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const response = await apiRequest("PUT", "/api/auth/profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordData) => {
      const response = await apiRequest("PUT", "/api/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully",
      });
      passwordForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to change password. Please check your current password.",
        variant: "destructive",
      });
    },
  });

  const onUpdateProfile = (data: ProfileData) => {
    updateProfileMutation.mutate(data);
  };

  const onChangePassword = (data: PasswordData) => {
    changePasswordMutation.mutate(data);
  };

  // Verification mutations
  const sendEmailVerificationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/verify-email/send", {});
      return response.json();
    },
    onSuccess: () => {
      setEmailVerificationSent(true);
      toast({
        title: "Verification code sent",
        description: "Check your email for the 6-digit verification code",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send verification code",
        variant: "destructive",
      });
    },
  });

  const confirmEmailVerificationMutation = useMutation({
    mutationFn: async (data: VerificationData) => {
      const response = await apiRequest("POST", "/api/auth/verify-email/confirm", data);
      return response.json();
    },
    onSuccess: () => {
      setEmailVerificationSent(false);
      emailVerificationForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Email verified",
        description: "Your email has been verified successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  const sendPhoneVerificationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/verify-phone/send", {});
      return response.json();
    },
    onSuccess: () => {
      setPhoneVerificationSent(true);
      toast({
        title: "Verification code sent",
        description: "Check your phone for the 6-digit verification code",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send verification code",
        variant: "destructive",
      });
    },
  });

  const confirmPhoneVerificationMutation = useMutation({
    mutationFn: async (data: VerificationData) => {
      const response = await apiRequest("POST", "/api/auth/verify-phone/confirm", data);
      return response.json();
    },
    onSuccess: () => {
      setPhoneVerificationSent(false);
      phoneVerificationForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Phone verified",
        description: "Your phone has been verified successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  // Update form values when user data loads
  if (currentUser && profileForm.getValues().firstName !== (currentUser as any).firstName) {
    profileForm.reset({
      firstName: (currentUser as any).firstName || "",
      lastName: (currentUser as any).lastName || "",
      email: (currentUser as any).email || "",
      phone: (currentUser as any).phone || "",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" data-testid="text-profile-title">
          Profile Settings
        </h1>
        <p className="text-gray-600">
          Manage your account settings and security preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="preferences" data-testid="tab-preferences">
            <Settings className="w-4 h-4 mr-2" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address (Read-only)</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            {...field} 
                            disabled={true}
                            className="bg-gray-50 text-gray-500"
                            data-testid="input-email" 
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-gray-500">Email cannot be changed for security reasons</p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-update-profile"
                  >
                    <User className="w-4 h-4 mr-2" />
                    {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Password Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Verification Section */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    <h3 className="font-medium">Email Verification</h3>
                    {(currentUser as any)?.emailVerified ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Not Verified
                      </Badge>
                    )}
                  </div>
                </div>
                
                {!(currentUser as any)?.emailVerified && (
                  <div className="space-y-3">
                    {!emailVerificationSent ? (
                      <Button
                        onClick={() => sendEmailVerificationMutation.mutate()}
                        disabled={sendEmailVerificationMutation.isPending}
                        variant="outline"
                        data-testid="button-send-email-verification"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {sendEmailVerificationMutation.isPending ? "Sending..." : "Send Verification Code"}
                      </Button>
                    ) : (
                      <Form {...emailVerificationForm}>
                        <form
                          onSubmit={emailVerificationForm.handleSubmit((data) => 
                            confirmEmailVerificationMutation.mutate(data)
                          )}
                          className="space-y-3"
                        >
                          <FormField
                            control={emailVerificationForm.control}
                            name="code"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Enter 6-digit code from email</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="123456"
                                    maxLength={6}
                                    data-testid="input-email-verification-code"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex space-x-2">
                            <Button
                              type="submit"
                              disabled={confirmEmailVerificationMutation.isPending}
                              data-testid="button-confirm-email-verification"
                            >
                              {confirmEmailVerificationMutation.isPending ? "Verifying..." : "Verify Email"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setEmailVerificationSent(false)}
                              data-testid="button-cancel-email-verification"
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </Form>
                    )}
                  </div>
                )}
              </div>

              {/* Phone Verification Section */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    <h3 className="font-medium">Phone Verification</h3>
                    {(currentUser as any)?.phoneVerified ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Not Verified
                      </Badge>
                    )}
                  </div>
                </div>
                
                {!(currentUser as any)?.phoneVerified && (
                  <div className="space-y-3">
                    {!phoneVerificationSent ? (
                      <Button
                        onClick={() => sendPhoneVerificationMutation.mutate()}
                        disabled={sendPhoneVerificationMutation.isPending}
                        variant="outline"
                        data-testid="button-send-phone-verification"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        {sendPhoneVerificationMutation.isPending ? "Sending..." : "Send Verification Code"}
                      </Button>
                    ) : (
                      <Form {...phoneVerificationForm}>
                        <form
                          onSubmit={phoneVerificationForm.handleSubmit((data) => 
                            confirmPhoneVerificationMutation.mutate(data)
                          )}
                          className="space-y-3"
                        >
                          <FormField
                            control={phoneVerificationForm.control}
                            name="code"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Enter 6-digit code from SMS</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="123456"
                                    maxLength={6}
                                    data-testid="input-phone-verification-code"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex space-x-2">
                            <Button
                              type="submit"
                              disabled={confirmPhoneVerificationMutation.isPending}
                              data-testid="button-confirm-phone-verification"
                            >
                              {confirmPhoneVerificationMutation.isPending ? "Verifying..." : "Verify Phone"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setPhoneVerificationSent(false)}
                              data-testid="button-cancel-phone-verification"
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </Form>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-medium text-yellow-800">Security Notice</h3>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  Profile updates are limited to once per month for security. Verify your email and phone for enhanced security.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Two-Factor Authentication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable 2FA</p>
                    <p className="text-sm text-gray-600">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Checkbox
                    checked={twoFaEnabled}
                    onCheckedChange={(checked) => setTwoFaEnabled(checked as boolean)}
                    data-testid="checkbox-2fa"
                  />
                </div>

                {twoFaEnabled && (
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <p className="text-sm font-medium text-blue-900">
                      2FA Setup Instructions
                    </p>
                    <ol className="text-sm text-blue-800 list-decimal list-inside mt-2 space-y-1">
                      <li>Install an authenticator app (Google Authenticator, Authy, etc.)</li>
                      <li>Scan the QR code below with your authenticator app</li>
                      <li>Enter the 6-digit code from your app to verify setup</li>
                    </ol>
                    <div className="mt-4 p-4 bg-white border rounded">
                      <p className="text-center text-gray-500">[QR Code would appear here]</p>
                    </div>
                    <Input 
                      className="mt-3" 
                      placeholder="Enter 6-digit code from authenticator app"
                      data-testid="input-2fa-code"
                    />
                    <Button className="mt-3" data-testid="button-verify-2fa">
                      Verify and Enable 2FA
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Account Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email notifications</p>
                    <p className="text-sm text-gray-600">
                      Receive email updates about results and system changes
                    </p>
                  </div>
                  <Checkbox defaultChecked data-testid="checkbox-email-notifications" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS notifications</p>
                    <p className="text-sm text-gray-600">
                      Receive SMS alerts for critical updates
                    </p>
                  </div>
                  <Checkbox data-testid="checkbox-sms-notifications" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dashboard auto-refresh</p>
                    <p className="text-sm text-gray-600">
                      Automatically refresh dashboard data every minute
                    </p>
                  </div>
                  <Checkbox defaultChecked data-testid="checkbox-auto-refresh" />
                </div>

                <Button data-testid="button-save-preferences">
                  <Settings className="w-4 h-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}