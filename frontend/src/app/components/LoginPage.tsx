import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Package, Tag, DollarSign, TrendingUp } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Animation keyframes
  const floatingAnimation = `
    @keyframes floating {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(0, 167, 165, 0.3); }
      50% { box-shadow: 0 0 40px rgba(0, 167, 165, 0.6); }
    }
    @keyframes rotate-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes slide-in-left {
      from { opacity: 0; transform: translateX(-30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slide-in-right {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="bg-[#F8FAFB] content-stretch flex flex-col items-start relative size-full min-h-screen">
      <style>{floatingAnimation}</style>
      <div className="h-full min-h-screen relative shrink-0 w-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start min-h-[inherit] relative size-full" style={{ animation: 'fade-in 0.5s ease-out' }}>

          {/* Left Side - Branding */}
          <div
            className="h-full relative shrink-0 w-[572px] min-h-screen"
            style={{
              backgroundImage: "linear-gradient(127.024deg, rgb(0, 53, 52) 0%, rgba(0, 86, 86, 0.95) 50%, rgb(0, 122, 94) 100%)"
            }}
          >
            <div className="bg-clip-padding border-0 border-[transparent] border-solid overflow-clip relative rounded-[inherit] size-full">

              {/* Blur Background Elements */}
              <div className="absolute h-full left-0 opacity-10 top-0 w-[572px] z-[1]">
                <div className="absolute bg-white blur-[64px] left-[80px] rounded-full size-[256px] top-[80px]" />
                <div className="absolute bg-white blur-[64px] left-[108px] rounded-full size-[384px] top-[294.4px]" />
              </div>

              {/* Thrift Store Illustration - Center (Behind content) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] z-[2] opacity-20" style={{ animation: 'floating 4s ease-in-out infinite' }}>
                {/* Main Shopping Bag */}
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Outer Glow Circle */}
                  <div className="absolute inset-0 rounded-full bg-white opacity-20" style={{ animation: 'pulse-glow 3s ease-in-out infinite' }} />

                  {/* Central Icon Container */}
                  <div className="relative w-[200px] h-[200px] bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white border-opacity-30">
                    <Package className="w-24 h-24 text-white opacity-60" strokeWidth={1.5} />
                  </div>

                  {/* Floating Tags Around */}
                  <div className="absolute top-[20px] right-[40px] w-[60px] h-[60px] bg-[#00A7A5] bg-opacity-40 rounded-full flex items-center justify-center shadow-lg" style={{ animation: 'floating 3s ease-in-out infinite 0.5s' }}>
                    <Tag className="w-8 h-8 text-white opacity-70" />
                  </div>

                  <div className="absolute bottom-[40px] left-[30px] w-[70px] h-[70px] bg-[#008967] bg-opacity-40 rounded-full flex items-center justify-center shadow-lg" style={{ animation: 'floating 3.5s ease-in-out infinite 1s' }}>
                    <DollarSign className="w-9 h-9 text-white opacity-70" />
                  </div>

                  <div className="absolute top-[60px] left-[20px] w-[50px] h-[50px] bg-[#00A7A5] bg-opacity-40 rounded-full flex items-center justify-center shadow-lg" style={{ animation: 'floating 3.2s ease-in-out infinite 1.5s' }}>
                    <TrendingUp className="w-7 h-7 text-white opacity-70" />
                  </div>

                  {/* Decorative Circles */}
                  <div className="absolute top-[100px] right-[10px] w-[30px] h-[30px] bg-white bg-opacity-15 rounded-full" style={{ animation: 'floating 2.8s ease-in-out infinite 0.8s' }} />
                  <div className="absolute bottom-[80px] right-[50px] w-[40px] h-[40px] bg-white bg-opacity-15 rounded-full" style={{ animation: 'floating 3.3s ease-in-out infinite 1.2s' }} />
                  <div className="absolute top-[150px] left-[60px] w-[25px] h-[25px] bg-white bg-opacity-15 rounded-full" style={{ animation: 'floating 2.5s ease-in-out infinite 0.3s' }} />

                  {/* Rotating Ring */}
                  <div className="absolute inset-[30px] border-2 border-white border-opacity-20 rounded-full" style={{ animation: 'rotate-slow 20s linear infinite' }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#00A7A5] opacity-50 rounded-full" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-[#008967] opacity-50 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Logo and Title */}
              <div className="absolute content-stretch flex gap-[12px] items-center left-[48px] top-[48px] w-[476px] z-[50]" style={{ animation: 'slide-in-left 0.6s ease-out' }}>
                <div className="relative rounded-full shadow-lg shrink-0 size-[48px] bg-white flex items-center justify-center" style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}>
                  <Package className="w-7 h-7 text-[#007A5E]" strokeWidth={2.2} />
                </div>
                <div className="relative shrink-0 w-[208.65px]">
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
                    <p className="font-['Poppins',sans-serif] font-bold leading-[32px] text-[24px] text-white whitespace-nowrap" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                      Inventra
                    </p>
                    <p className="font-['Inter',sans-serif] font-normal leading-[20px] text-[14px] text-[rgba(255,255,255,0.95)] whitespace-nowrap" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                      Inventory Management System
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="absolute content-stretch flex flex-col items-start left-[48px] bottom-[100px] w-[476px] z-[50]" style={{ animation: 'slide-in-left 0.8s ease-out' }}>
                <h2 className="font-['Inter',sans-serif] font-bold leading-[40px] text-[36px] text-white w-[476px]" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                  Manage Your Inventory with Ease
                </h2>
                <p className="font-['Inter',sans-serif] font-normal leading-[29.25px] pt-[16px] text-[18px] text-[rgba(255,255,255,0.95)] w-[476px]" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                  Track items, manage stock levels, and streamline your operations with our inventory platform.
                </p>

                {/* Features */}
                <div className="content-stretch flex flex-col items-start pt-[32px] w-[476px]">
                  <div className="content-stretch flex gap-[16px] items-start w-full" style={{ animation: 'slide-in-left 1s ease-out' }}>
                    <div className="relative rounded-full shadow-md shrink-0 size-[40px] bg-[#00A7A5] flex items-center justify-center transition-transform hover:scale-110 hover:rotate-6 duration-300">
                      <svg className="size-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div className="relative shrink-0 w-[297.625px]">
                      <p className="font-['Inter',sans-serif] font-semibold leading-[27px] text-[18px] text-white whitespace-nowrap" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                        Stock Management
                      </p>
                      <p className="font-['Inter',sans-serif] font-normal leading-[20px] pt-[4px] text-[14px] text-[rgba(255,255,255,0.95)] whitespace-nowrap" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                        Track items by category, type, and location
                      </p>
                    </div>
                  </div>

                  <div className="content-stretch flex gap-[16px] items-start pt-[16px] w-full" style={{ animation: 'slide-in-left 1.2s ease-out' }}>
                    <div className="relative rounded-full shadow-md shrink-0 size-[40px] bg-[#008967] flex items-center justify-center transition-transform hover:scale-110 hover:rotate-6 duration-300">
                      <svg className="size-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <div className="relative shrink-0 w-[317.675px]">
                      <p className="font-['Inter',sans-serif] font-semibold leading-[27px] text-[18px] text-white whitespace-nowrap" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                        Low Stock Alerts
                      </p>
                      <p className="font-['Inter',sans-serif] font-normal leading-[20px] pt-[4px] text-[14px] text-[rgba(255,255,255,0.95)] whitespace-nowrap" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                        Get notified when items are running low
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="bg-[#F8FAFB] flex-[572_0_0] h-full min-w-px min-h-screen relative">
            <div className="flex flex-row items-center justify-center size-full">
              <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center p-[32px] relative size-full">
                <div className="max-w-[448px] relative shrink-0 w-[448px]" style={{ animation: 'slide-in-right 0.6s ease-out' }}>
                  <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start max-w-[inherit] relative size-full">

                    {/* Header */}
                    <div className="relative shrink-0 w-full">
                      <h2 className="font-['Inter',sans-serif] font-bold leading-[36px] text-[30px] text-[#323B42] whitespace-nowrap">
                        Welcome Back
                      </h2>
                      <p className="font-['Inter',sans-serif] font-normal leading-[24px] pt-[8px] text-[16px] text-[#6b7280] whitespace-nowrap">
                        Sign in to your account to continue
                      </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="relative shrink-0 w-[448px] pt-[32px]">

                      {/* Email Field */}
                      <div className="relative shrink-0 w-full">
                        <label className="block font-['Inter',sans-serif] font-medium leading-[20px] text-[14px] text-[#323B42] mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-[16px] size-[20px] top-[14.8px] text-[#6b7280]" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="bg-white h-[49.6px] w-full rounded-[16px] pl-[48.8px] pr-[16.8px] py-[12.8px] font-['Inter',sans-serif] text-[16px] text-[#323B42] placeholder:text-[rgba(41,37,36,0.5)] border border-[#00A7A5] focus:outline-none focus:border-[#007A5E]"
                            required
                          />
                        </div>
                      </div>

                      {/* Password Field */}
                      <div className="relative shrink-0 w-[448px] pt-[20px]">
                        <label className="block font-['Inter',sans-serif] font-medium leading-[20px] text-[14px] text-[#323B42] mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-[16px] size-[20px] top-[14.8px] text-[#6b7280]" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="bg-white h-[49.6px] w-full rounded-[16px] pl-[48.8px] pr-[48.8px] py-[12.8px] font-['Inter',sans-serif] text-[16px] text-[#323B42] placeholder:text-[rgba(41,37,36,0.5)] border border-[#00A7A5] focus:outline-none focus:border-[#007A5E]"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-[16px] top-[14.8px] text-[#6b7280] hover:text-[#323B42]"
                          >
                            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Remember Me & Forgot Password */}
                      <div className="flex items-center justify-between py-[20px] w-[448px]">
                        <label className="flex items-center gap-[8px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="size-[16px] rounded accent-[#007A5E]"
                          />
                          <span className="font-['Inter',sans-serif] font-medium leading-[20px] text-[14px] text-[#6b7280]">
                            Remember me
                          </span>
                        </label>
                        <button
                          type="button"
                          className="font-['Inter',sans-serif] font-normal leading-[20px] text-[14px] text-[#007A5E] hover:text-[#008967]"
                        >
                          Forgot password?
                        </button>
                      </div>

                      {/* Sign In Button */}
                      <button
                        type="submit"
                        className="h-[48px] w-[448px] rounded-[16px] font-['Inter',sans-serif] font-medium text-[16px] text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                        style={{
                          backgroundImage: "linear-gradient(90deg, rgb(0, 122, 94) 0%, rgb(0, 137, 103) 25%, rgb(0, 151, 111) 50%, rgb(0, 164, 118) 75%, rgb(0, 167, 165) 100%)"
                        }}
                      >
                        Sign In
                      </button>

                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
