import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import logoImage from "../../imports/ims-logo.png";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // Determine user role based on email
    let userRole = "staff";
    if (email.includes("admin")) {
      userRole = "admin";
    }

    // Store user info in localStorage
    localStorage.setItem("userRole", userRole);
    localStorage.setItem("userEmail", email);

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-secondary p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-lg flex-shrink-0">
              <img src={logoImage} alt="Bukolabs.io Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Bukolabs.io</h1>
              <p className="text-white/80 text-sm">Cracking Ideas, Coding the Future</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-white">
          <h2 className="text-4xl font-bold mb-4">Manage Your Food Inventory with Ease</h2>
          <p className="text-white/90 text-lg leading-relaxed">
            Track food items, manage expiration dates, and reduce waste with our specialized food inventory platform.
          </p>

          <div className="mt-12 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-md flex-shrink-0">
                <img src={logoImage} alt="Bukolabs.io" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Expiration Tracking</h3>
                <p className="text-white/80 text-sm">Monitor expiration dates and reduce food waste</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-md flex-shrink-0">
                <img src={logoImage} alt="Bukolabs.io" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Freshness Alerts</h3>
                <p className="text-white/80 text-sm">Get notified when items are approaching expiration</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-md flex-shrink-0">
                <img src={logoImage} alt="Bukolabs.io Logo" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-xl font-bold">Bukolabs.io</h1>
            </div>

            <h2 className="text-3xl font-bold text-foreground mb-2">Welcome</h2>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm mb-2 text-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-3 bg-input-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm mb-2 text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 bg-input-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-primary/50"
                />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
              <a href="#" className="text-sm text-primary hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-secondary text-white py-3 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 font-medium"
            >
              Sign In
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-input"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-background text-muted-foreground">Demo Credentials</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl p-4 text-sm" style={{ background: "linear-gradient(to right, #E0F7F7, #E0F2F0)", border: "1px solid #009BA5" }}>
                <p className="font-semibold mb-2" style={{ color: "#005656" }}>Admin Account (Full Access)</p>
                <p className="mb-1" style={{ color: "#007A5E" }}>Email: <span className="text-foreground font-medium">admin@bukolabs.io</span></p>
                <p style={{ color: "#007A5E" }}>Password: <span className="text-foreground font-medium">admin123</span></p>
              </div>

              <div className="rounded-xl p-4 text-sm" style={{ background: "linear-gradient(to right, #D1F2E8, #E8F5F0)", border: "1px solid #008967" }}>
                <p className="font-semibold mb-2" style={{ color: "#005656" }}>Staff Account (Limited Access)</p>
                <p className="mb-1" style={{ color: "#007A5E" }}>Email: <span className="text-foreground font-medium">staff@bukolabs.io</span></p>
                <p style={{ color: "#007A5E" }}>Password: <span className="text-foreground font-medium">staff123</span></p>
              </div>

              <div className="rounded-xl p-3 text-xs" style={{ background: "#F8FAFB", border: "1px solid rgba(50, 59, 66, 0.15)" }}>
                <p className="text-muted-foreground text-center">
                  🎉 <span className="font-semibold">System pre-loaded with sample data:</span> 65+ products, suppliers, orders, recipes, and transactions
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
