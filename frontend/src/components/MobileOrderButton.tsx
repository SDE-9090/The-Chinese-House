import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

const MobileOrderButton = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 md:hidden z-50 p-3 bg-gradient-to-t from-background via-background to-transparent">
      <Link
        to="/order"
        className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-semibold text-lg shadow-xl"
      >
        <ShoppingCart size={20} />
        Order Now
      </Link>
    </div>
  );
};

export default MobileOrderButton;
