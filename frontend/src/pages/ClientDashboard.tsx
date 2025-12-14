import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Activity, ShieldCheck, Clock } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

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
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Client Dashboard</h2>
          <p className="text-muted-foreground">Overview of your monitored endpoints and SSL status.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add New Monitor
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Avg. Global Latency</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142ms</div>
            <p className="text-xs text-muted-foreground">Checked from 12 regions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SSL Security</CardTitle>
            <ShieldCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Valid</div>
            <p className="text-xs text-muted-foreground">Expires in 28 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Uptime History</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[90, 100]} />
                  <Tooltip 
                    cursor={{fill: 'black'}}
                    label={"Gwewuj"}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'red' }}
                  />
                  <Bar dataKey="uptime" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Monitored Endpoints</CardTitle>
            <CardDescription>Real-time status updates.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">API Server (US-East)</TableCell>
                  <TableCell><Badge className="bg-green-500 hover:bg-green-600">Operational</Badge></TableCell>
                  <TableCell className="text-right">45ms</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Web App (Global)</TableCell>
                  <TableCell><Badge className="bg-green-500 hover:bg-green-600">Operational</Badge></TableCell>
                  <TableCell className="text-right">120ms</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Legacy DB</TableCell>
                  <TableCell><Badge variant="destructive">Downtime</Badge></TableCell>
                  <TableCell className="text-right">--</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;