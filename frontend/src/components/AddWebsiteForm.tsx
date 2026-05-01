import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useState } from 'react';
import { axiosClient } from '@/config';

interface AddWebsiteFormProps extends React.HTMLAttributes<HTMLDivElement> {
    onClose?: () => void;
    onSuccess?: () => void;
}

export function AddWebsiteForm({ className, onClose, onSuccess, ...props }: AddWebsiteFormProps) {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [checkUptime, setCheckUptime] = useState(false);
    const [checkLatency, setCheckLatency] = useState(false);
    const [checkSsl, setCheckSsl] = useState(false);
    const [regions, setRegions] = useState<string[]>([]);
    const [interval, setInterval] = useState<string>('5');

    const CONTINENTS = [
        { id: 'Asia', label: 'Asia' },
        { id: 'North America', label: 'North America' },
        { id: 'South America', label: 'South America' },
        { id: 'Europe', label: 'Europe' },
        { id: 'Africa', label: 'Africa' },
        { id: 'Oceania', label: 'Oceania' },
        { id: 'Antarctica', label: 'Antarctica' },
    ] as const;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !url) {
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
            onSuccess?.();
            onClose?.();
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
                <Label>Regions</Label>
                <div className="grid grid-cols-2 gap-2">
                    {CONTINENTS.map((c) => (
                        <div key={c.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={`continent-${c.id}`}
                                checked={regions.includes(c.id)}
                                onCheckedChange={(checked) =>
                                    setRegions((prev) => (checked ? [...prev, c.id] : prev.filter((region) => region !== c.id)))
                                }
                            />
                            <Label htmlFor={`continent-${c.id}`}>{c.label}</Label>
                        </div>
                    ))}
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
