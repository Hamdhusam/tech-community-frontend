"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TechShell from "@/components/TechShell";
import { Sparkles, UserPlus } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  
  // Basic auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Student profile fields
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [studentId, setStudentId] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [section, setSection] = useState("");
  const [branch, setBranch] = useState("");
  
  const [loading, setLoading] = useState(false);

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    
    if (password.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }
    
    if (!phoneNumber.match(/^[0-9]{10}$/)) {
      alert("Please enter a valid 10-digit phone number!");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address!");
      return;
    }
    
    // Trim and lowercase email
    const cleanEmail = email.trim().toLowerCase();
    
    setLoading(true);
    
    try {
      // Sign up with Supabase
      const { data, error } = await authClient.signUp.email({ 
        email: cleanEmail, 
        password,
        name: fullName
      });
      
      if (error) {
        console.error('Signup error:', error);
        
        // Better error messages
        let errorMessage = error.message;
        
        if (error.message.includes('invalid')) {
          errorMessage = `Invalid email format: "${cleanEmail}"\n\n`;
          errorMessage += "Common issues:\n";
          errorMessage += "• Check for typos in the domain (e.g., 'stellamaryscoe' not 'stellamryscoe')\n";
          errorMessage += "• Make sure email format is: name@domain.com\n";
          errorMessage += "• Some email providers may not be supported\n\n";
          errorMessage += "Try using a different email address (Gmail, Outlook, etc.)";
        } else if (error.message.includes('already registered') || error.message.includes('already exists')) {
          errorMessage = "This email is already registered!\n\nPlease try:\n• Using a different email\n• Sign in instead of signing up\n• Contact admin if you forgot your password";
        }
        
        alert(errorMessage);
        return;
      }
      
      // Check if user was created
      if (!data?.user) {
        alert("Registration request sent, but no response received. Please try again or contact administrator.");
        return;
      }
      
      console.log('User created:', data.user.id);
      console.log('Has session:', !!data.session);
      
      // Store additional profile data
      const profileData = {
        user_id: data.user.id,
        full_name: fullName,
        email: cleanEmail,
        phone_number: phoneNumber,
        student_id: studentId,
        year_of_study: yearOfStudy,
        section: section,
        branch: branch,
      };
      
      // Save profile data to database
      const profileResponse = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      
      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        console.error('Failed to save profile data:', errorData);
        alert(`User account created but profile save failed: ${errorData.error}\n\nYou can still sign in, but contact administrator to complete your profile.`);
      }
      
      // Check if email confirmation is required
      if (data.user && !data.session) {
        alert(`✅ Registration successful!\n\n📧 Please check your email (${cleanEmail}) to confirm your account before signing in.\n\nIf you don't see the email, check your spam folder.`);
      } else {
        alert("✅ Registration successful! You can now sign in.");
      }
      
      router.push("/sign-in?registered=true");
      
    } catch (err) {
      console.error('Registration error:', err);
      alert("An error occurred during registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TechShell>
      <div className="mx-auto max-w-2xl">
        <Card className="border-[oklch(1_0_0_/10%)] bg-[oklch(0.2_0_0)]/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-[oklch(0.696_0.17_240)]"/> Register as Flexie
            </CardTitle>
            <CardDescription>Join the Flex Academics community - Create your participant account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={register} className="grid gap-6">
              
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Personal Information</h3>
                
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
                  <Input 
                    id="fullName" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    required 
                    placeholder="John Doe"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    placeholder="you@college.edu"
                  />
                  <p className="text-xs text-muted-foreground">Use your college email or personal email</p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="phoneNumber">Phone Number (WhatsApp) <span className="text-red-500">*</span></Label>
                  <Input 
                    id="phoneNumber" 
                    type="tel" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))} 
                    required 
                    placeholder="9876543210"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">10-digit number for WhatsApp notifications</p>
                </div>
              </div>

              {/* Academic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Academic Information</h3>
                
                <div className="grid gap-2">
                  <Label htmlFor="studentId">Student ID <span className="text-red-500">*</span></Label>
                  <Input 
                    id="studentId" 
                    value={studentId} 
                    onChange={(e) => setStudentId(e.target.value)} 
                    required 
                    placeholder="21BCE1234"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="yearOfStudy">Year of Study <span className="text-red-500">*</span></Label>
                    <Select value={yearOfStudy} onValueChange={setYearOfStudy} required>
                      <SelectTrigger id="yearOfStudy">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="section">Section <span className="text-red-500">*</span></Label>
                    <Input 
                      id="section" 
                      value={section} 
                      onChange={(e) => setSection(e.target.value.toUpperCase())} 
                      required 
                      placeholder="A"
                      maxLength={2}
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="branch">Branch/Department <span className="text-red-500">*</span></Label>
                  <Select value={branch} onValueChange={setBranch} required>
                    <SelectTrigger id="branch">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CSE">Computer Science Engineering</SelectItem>
                      <SelectItem value="ECE">Electronics & Communication</SelectItem>
                      <SelectItem value="EEE">Electrical & Electronics</SelectItem>
                      <SelectItem value="MECH">Mechanical Engineering</SelectItem>
                      <SelectItem value="CIVIL">Civil Engineering</SelectItem>
                      <SelectItem value="IT">Information Technology</SelectItem>
                      <SelectItem value="AI-ML">AI & Machine Learning</SelectItem>
                      <SelectItem value="DS">Data Science</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Account Security */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Account Security</h3>
                
                <div className="grid gap-2">
                  <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">At least 6 characters</p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-500">*</span></Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                <UserPlus className="size-4 mr-2" />
                {loading ? "Creating account..." : "Create Flexie Account"}
              </Button>
            </form>
            
            <p className="mt-4 text-xs text-center text-muted-foreground">
              Already have an account? <Link href="/sign-in" className="text-[oklch(0.696_0.17_240)] hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </TechShell>
  );
}