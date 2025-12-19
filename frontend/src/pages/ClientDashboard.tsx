import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Activity, ShieldCheck, Clock, CheckCircle, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AddWebsiteForm } from '@/components/AddWebsiteForm';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { getUserWebsites, type UserWebsite } from '@/services/website.service';
const data = [
  { name: 'Mon', uptime: 99.9 },
  { name: 'Tue', uptime: 100 },
  { name: 'Wed', uptime: 99.8 },
  { name: 'Thu', uptime: 100 },
  { name: 'Fri', uptime: 100 },
  { name: 'Sat', uptime: 99.5 },
  { name: 'Sun', uptime: 100 },
];

const ClientDashboard = () => {
  const [addWebsiteDialogOpen, setAddWebsiteDialogOpen] = useState(false);
  const [websites, setWebsites] = useState<UserWebsite[]>([]);
  const [isLoadingWebsites, setIsLoadingWebsites] = useState(true);
  const { user, isAuthenticated, isLoading } = useUserStore();
  const navigate = useNavigate();
  const fetchWebsites = () => {
    setIsLoadingWebsites(true);
    getUserWebsites()
      .then(data => {
        setWebsites(data);
      })
      .catch(err => {
        console.error("Failed to fetch websites:", err);
      })
      .finally(() => {
        setIsLoadingWebsites(false);
      })
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }

    if (isAuthenticated) {
      fetchWebsites();
    }
  }, [isLoading, isAuthenticated, navigate]);
  if (!isLoading && isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Client Dashboard</h2>
            <p className="text-muted-foreground">Overview of your monitored endpoints and system health.</p>
          </div>

          {/* Mobile View: Link to separate page */}
          <Button size="lg" className="gap-2 md:hidden" asChild>
            <Link to="/client/add-website">
              <Plus className="h-4 w-4" /> Add Website
            </Link>
          </Button>

          {/* Desktop View: Dialog */}
          <Dialog open={addWebsiteDialogOpen} onOpenChange={setAddWebsiteDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 hidden md:flex">
                <Plus className="h-4 w-4" /> Add New Website
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Website</DialogTitle>
                <DialogDescription>
                  Configure monitoring settings for your website.
                </DialogDescription>
              </DialogHeader>
              <AddWebsiteForm onClose={() => setAddWebsiteDialogOpen(false)} onSuccess={fetchWebsites} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Uptime</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99.92%</div>
              <p className="text-xs text-muted-foreground">+0.1% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status Summary</CardTitle>
              <div className="flex gap-1">
                <span className="flex items-center text-xs text-green-500"><CheckCircle className="h-3 w-3 mr-1" /> 5</span>
                <span className="flex items-center text-xs text-red-500"><XCircle className="h-3 w-3 mr-1" /> 1</span>
                <span className="flex items-center text-xs text-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" /> 0</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mt-2">
                <div className="text-center">
                  <span className="text-xl font-bold text-green-600">5</span>
                  <p className="text-[10px] uppercase text-muted-foreground">Up</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <span className="text-xl font-bold text-red-600">1</span>
                  <p className="text-[10px] uppercase text-muted-foreground">Down</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <span className="text-xl font-bold text-yellow-600">0</span>
                  <p className="text-[10px] uppercase text-muted-foreground">Degraded</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span className="leading-tight">SSL for <strong>api.example.com</strong> expires in 3 days.</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                  <span className="leading-tight">High latency detected on <strong>eu-west</strong> node.</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Global Latency</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">142ms</div>
              <p className="text-xs text-muted-foreground">Average across all regions</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Uptime History (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[90, 100]} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', color: 'black' }}
                    />
                    <Bar dataKey="uptime" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Monitored Websites</CardTitle>
              <CardDescription>Real-time status of your endpoints.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWebsites ? (
                <div className="flex justify-center p-4">Loading...</div>
              ) : websites.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <p className="text-muted-foreground mb-4">No websites added yet.</p>
                  <Button size="sm" onClick={() => setAddWebsiteDialogOpen(true)}>Add your first website</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Latency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {websites.map((website) => {
                      // Random simulation for demo
                      const isUp = Math.random() > 0.2;
                      const latency = Math.floor(Math.random() * (150 - 20) + 20);

                      return (
                        <TableRow key={website.id}>
                          <TableCell className="font-medium">{website.name}</TableCell>
                          <TableCell>
                            {isUp ? (
                              <Badge className="bg-green-500 hover:bg-green-600">Operational</Badge>
                            ) : (
                              <Badge variant="destructive">Downtime</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{isUp ? `${latency}ms` : '--'}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
};

export default ClientDashboard;