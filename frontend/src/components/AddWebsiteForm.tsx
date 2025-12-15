import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useState } from 'react';
import { axiosClient } from '@/config';

interface AddWebsiteFormProps extends React.HTMLAttributes<HTMLDivElement> { }

export function AddWebsiteForm({ className, ...props }: AddWebsiteFormProps) {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [checkUptime, setCheckUptime] = useState(false);
    const [checkLatency, setCheckLatency] = useState(false);
    const [checkSsl, setCheckSsl] = useState(false);
    const [regions, setRegions] = useState<string[]>([]);
    const [interval, setInterval] = useState<string>('5');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !url) {
            return;
        }
        if (!checkUptime && !checkLatency && !checkSsl) {
            return;
        }
        if (!regions.length) {
            return;
        }
        if (!interval) {
            return;
        }
        try {
            const response = await axiosClient.post('/websites', {
                name,
                url,
                checkUptime,
                checkLatency,
                checkSsl,
                regions,
                check_interval: Number(interval),
                is_active: true,
            });
            console.log(response.data);
        } catch (error) {
            console.error(error);
        }
    }
    return (
        <div className={cn("grid gap-4 py-4", className)} {...props}>
            <div className="grid gap-2">
                <Label htmlFor="name">Website Name</Label>
                <Input id="name" placeholder="Website Name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="url">Website URL</Label>
                <Input id="url" placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="grid gap-2">
                <Label>Checks to Enable</Label>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="check-uptime" checked={checkUptime} onCheckedChange={(checked) => setCheckUptime(checked as boolean)} />
                        <Label htmlFor="check-uptime">Uptime Monitor</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="check-latency" checked={checkLatency} onCheckedChange={(checked) => setCheckLatency(checked as boolean)} />
                        <Label htmlFor="check-latency">Latency Check</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="check-ssl" checked={checkSsl} onCheckedChange={(checked) => setCheckSsl(checked as boolean)} />
                        <Label htmlFor="check-ssl">SSL Expiry Alert</Label>
                    </div>
                </div>
            </div>
            <div className="grid gap-2">
                <Label>Regions</Label>
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="region-us" checked={regions.includes('us-east-1')} onCheckedChange={(checked) => setRegions((prev) => (checked ? [...prev, 'us-east-1'] : prev.filter((region) => region !== 'us-east-1')))} />
                        <Label htmlFor="region-us">US East (N. Virginia)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="region-eu" checked={regions.includes('eu-west-2')} onCheckedChange={(checked) => setRegions((prev) => (checked ? [...prev, 'eu-west-2'] : prev.filter((region) => region !== 'eu-west-2')))} />
                        <Label htmlFor="region-eu">EU West (London)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="region-asia" checked={regions.includes('ap-southeast-1')} onCheckedChange={(checked) => setRegions((prev) => (checked ? [...prev, 'ap-southeast-1'] : prev.filter((region) => region !== 'ap-southeast-1')))} />
                        <Label htmlFor="region-asia">Asia Pacific (Singapore)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="region-au" checked={regions.includes('ap-southeast-2')} onCheckedChange={(checked) => setRegions((prev) => (checked ? [...prev, 'ap-southeast-2'] : prev.filter((region) => region !== 'ap-southeast-2')))} />
                        <Label htmlFor="region-au">Australia (Sydney)</Label>
                    </div>
                </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="interval">Monitoring Interval</Label>
                <Select value={interval} onValueChange={setInterval}>
                    <SelectTrigger id="interval">
                        <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button type="submit" onClick={handleSubmit} className="w-full mt-4">Add Website</Button>
        </div>
    )
}
