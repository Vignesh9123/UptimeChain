import { prisma } from "@uptime-chain/database";

export async function prepare() {
    try {
        console.log("Starting preparation of website schedules...");
        const schedules = await prisma.websiteSchedule.findMany();
        
        for (const schedule of schedules) {
            let nextRunTime = schedule.next_run.getTime();
            let updated = false;

           
            while (nextRunTime < Date.now() + 1 * 60 * 1000) {
                nextRunTime += schedule.interval_seconds * 1000;
                updated = true;
            }

            if (updated) {
                await prisma.websiteSchedule.update({
                    where: { id: schedule.id },
                    data: {
                        next_run: new Date(nextRunTime)
                    }
                });
                console.log(`Updated schedule ${schedule.id}. New next_run: ${new Date(nextRunTime).toISOString()}`);
            }
        }
        
        console.log("Successfully prepared website schedules.");
    } catch (error) {
        console.error("Error during schedule preparation:", error);
    }
}

prepare()
