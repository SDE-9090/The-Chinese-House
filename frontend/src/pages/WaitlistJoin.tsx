import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getTenantSlug, apiGetPublicBusinessInfo, apiPublicJoinWaitlist, PublicBusinessInfo } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WaitlistJoin() {
  const slug = getTenantSlug();
  const [business, setBusiness] = useState<PublicBusinessInfo | null>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [waitData, setWaitData] = useState<{ estimatedWait: number, position: number } | null>(null);
  
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function fetchInfo() {
      if (!slug) return;
      try {
        const data = await apiGetPublicBusinessInfo();
        setBusiness(data);
      } catch (err) {
        console.error("Failed to load business info:", err);
      } finally {
        setLoadingBusiness(false);
      }
    }
    fetchInfo();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    
    // Basic validation
    if (!name.trim()) {
      setErrorMsg("Please enter your name");
      return;
    }
    if (!phone.match(/^[0-9]{10}$/)) {
      setErrorMsg("Please enter a valid 10-digit phone number");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    
    try {
      const formattedPhone = `91${phone}`;
      const data = await apiPublicJoinWaitlist(slug, {
        name,
        phone: formattedPhone,
        party_size: parseInt(partySize, 10)
      });
      setWaitData({ estimatedWait: data.estimatedWait, position: data.position });
      setJoined(true);
      localStorage.setItem("classic_customer_phone", formattedPhone);
      localStorage.setItem("classic_customer_name", name);
      toast({ title: "Successfully joined the waitlist!" });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to join waitlist. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>Restaurant not found or inactive.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 selection:bg-primary/10">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-primary/5 p-8 text-center border-b border-gray-100">
          {business.logo_url ? (
            <img 
              src={business.logo_url} 
              alt={business.name} 
              className="w-20 h-20 mx-auto rounded-full object-cover shadow-sm mb-4"
            />
          ) : (
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-primary">{business.name.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-gray-500 mt-1 text-sm">Digital Waitlist</p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {joined && waitData ? (
            <div className="text-center py-6 animate-in fade-in zoom-in duration-500">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You're on the list!</h2>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Position</p>
                    <p className="text-3xl font-bold text-primary">{waitData.position}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Est. Wait</p>
                    <p className="text-3xl font-bold text-primary">{waitData.estimatedWait}<span className="text-lg font-medium text-gray-600 ml-1">min</span></p>
                  </div>
                </div>
              </div>

              <div className="flex items-start bg-blue-50 text-blue-800 p-4 rounded-xl text-left">
                <MessageSquare className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0 text-blue-600" />
                <p className="text-sm font-medium leading-relaxed">
                  We'll send you a <span className="font-bold">WhatsApp text</span> with live updates and ping you when your table is ready. Feel free to wait comfortably anywhere nearby!
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {errorMsg && (
                <Alert variant="destructive">
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp Phone Number</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none border-r pr-3 my-2 border-gray-200">
                    <span className="text-gray-500 text-sm font-medium">+91</span>
                  </div>
                  <Input 
                    id="phone" 
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    className="h-12 pl-[3.5rem]"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">We will only use this to send you table updates.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="partySize">Party Size</Label>
                <Select value={partySize} onValueChange={setPartySize}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select party size" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} People</SelectItem>
                    ))}
                    <SelectItem value="13">13+ People</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full h-12 text-lg font-medium shadow-md transition-transform hover:scale-[1.02]" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {submitting ? "Joining..." : "Join Waitlist"}
              </Button>
            </form>
          )}
        </div>
        
      </div>
    </div>
  );
}
