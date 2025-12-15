import { AddWebsiteForm } from "@/components/AddWebsiteForm";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AddWebsitePage = () => {
    return (
        <div className="flex flex-col gap-6 py-6">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" asChild>
                    <Link to="/client">
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold">Add New Website</h1>
            </div>
            <div className="px-4">
                <p className="text-muted-foreground mb-6">Configure monitoring settings for your new endpoint.</p>
                <AddWebsiteForm />
            </div>
        </div>
    );
}

export default AddWebsitePage;
