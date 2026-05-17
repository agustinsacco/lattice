import { Button } from "@/components/ui/button";
import { logout } from "@/app/(auth)/actions"; // Import the logout Server Action

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" size="sm" variant={"outline"}>
        Logout
      </Button>
    </form>
  );
}
