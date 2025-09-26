"use client";
import { useMemo, useState } from "react";
import TechShell from "@/components/TechShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// Mock dataset until backend APIs are wired
const mockParticipants = Array.from({ length: 24 }).map((_, i) => {
  const choices = [
    { value: "attending-classes", label: "Attending Classes" },
    { value: "flex-academics", label: "Flex Academics" },
    { value: "official-duty-od", label: "OD" },
    { value: "leave-absent", label: "Leave/Absent" },
  ];
  const years = ["I", "II", "III", "IV"];
  const sections = ["A", "B", "C"];
  const pick = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
  const choice = pick(choices);
  const strikes = Math.floor(Math.random() * 11);
  return {
    id: i + 1,
    name: `Student ${i + 1}`,
    year: pick(years),
    section: pick(sections),
    choiceValue: choice.value,
    choiceLabel: choice.label,
    notion: Math.random() > 0.35,
    strikes,
    lastSubmission: Date.now() - Math.floor(Math.random() * 1000 * 60 * 60),
  };
});

export default function VisualizationsPage() {
  const [filterYear, setFilterYear] = useState<string>("all-years");
  const [filterSection, setFilterSection] = useState<string>("all-sections");
  const [filterChoice, setFilterChoice] = useState<string>("all-choices");
  const [strikeMin, setStrikeMin] = useState<string>("");
  const [strikeMax, setStrikeMax] = useState<string>("");

  const filtered = useMemo(() => {
    return mockParticipants.filter((p) => {
      const okYear = filterYear === "all-years" || p.year === filterYear;
      const okSec = filterSection === "all-sections" || p.section === filterSection;
      const okChoice = filterChoice === "all-choices" || p.choiceValue === filterChoice;
      const minOk = strikeMin === "" || p.strikes >= Number(strikeMin);
      const maxOk = strikeMax === "" || p.strikes <= Number(strikeMax);
      return okYear && okSec && okChoice && minOk && maxOk;
    });
  }, [filterYear, filterSection, filterChoice, strikeMin, strikeMax]);

  const todayCounts = useMemo(() => {
    const map: Record<string, number> = {
      "attending-classes": 0,
      "flex-academics": 0,
      "official-duty-od": 0,
      "leave-absent": 0,
    };
    filtered.forEach((p) => (map[p.choiceValue] += 1));
    return map;
  }, [filtered]);

  const pieData = {
    labels: ["Attending", "Flex", "OD", "Leave"],
    datasets: [
      {
        data: [
          todayCounts["attending-classes"],
          todayCounts["flex-academics"],
          todayCounts["official-duty-od"],
          todayCounts["leave-absent"],
        ],
        backgroundColor: [
          "oklch(0.696 0.17 162.48 / .8)",
          "oklch(0.488 0.243 264.376 / .8)",
          "oklch(0.645 0.246 16.439 / .8)",
          "oklch(0.627 0.265 303.9 / .8)",
        ],
        borderColor: "transparent",
      },
    ],
  } as const;

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekly = useMemo(() => {
    // Random weekly trend demo
    const rand = () => Math.floor(10 + Math.random() * 20);
    return {
      attending: days.map(rand),
      flex: days.map(rand),
      od: days.map(rand),
      leave: days.map(rand),
    };
  }, []);

  const barData = {
    labels: days,
    datasets: [
      { label: "Attending", data: weekly.attending, backgroundColor: "oklch(0.696 0.17 162.48 / .8)" },
      { label: "Flex", data: weekly.flex, backgroundColor: "oklch(0.488 0.243 264.376 / .8)" },
      { label: "OD", data: weekly.od, backgroundColor: "oklch(0.645 0.246 16.439 / .8)" },
      { label: "Leave", data: weekly.leave, backgroundColor: "oklch(0.627 0.265 303.9 / .8)" },
    ],
  } as const;

  const exportCSV = () => {
    const headers = [
      "Student Name",
      "Year",
      "Section",
      "Tomorrow's Choice",
      "Notion Updated",
      "Strike Count",
      "Last Submission Time",
    ];
    const rows = filtered.map((p) => [
      p.name,
      p.year,
      p.section,
      p.choiceLabel,
      p.notion ? "Y" : "N",
      String(p.strikes),
      new Date(p.lastSubmission).toLocaleString(),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participants-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TechShell>
      <div className="grid gap-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Today's Attendance</CardTitle>
              <CardDescription>Distribution across choices</CardDescription>
            </CardHeader>
            <CardContent>
              <Pie data={pieData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Weekly Trends</CardTitle>
              <CardDescription>Participants per day</CardDescription>
            </CardHeader>
            <CardContent>
              <Bar data={barData} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
            <CardDescription>Filter and export roster</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid sm:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label>Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-years">All Years</SelectItem>
                    <SelectItem value="I">I</SelectItem>
                    <SelectItem value="II">II</SelectItem>
                    <SelectItem value="III">III</SelectItem>
                    <SelectItem value="IV">IV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Section</Label>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-sections">All Sections</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Choice</Label>
                <Select value={filterChoice} onValueChange={setFilterChoice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-choices">All Choices</SelectItem>
                    <SelectItem value="attending-classes">Attending Classes</SelectItem>
                    <SelectItem value="flex-academics">Flex Academics</SelectItem>
                    <SelectItem value="official-duty-od">OD</SelectItem>
                    <SelectItem value="leave-absent">Leave/Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Strike min</Label>
                <Input inputMode="numeric" value={strikeMin} onChange={(e)=>setStrikeMin(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Strike max</Label>
                <Input inputMode="numeric" value={strikeMax} onChange={(e)=>setStrikeMax(e.target.value)} placeholder="10" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={()=>{setFilterYear("all-years");setFilterSection("all-sections");setFilterChoice("all-choices");setStrikeMin("");setStrikeMax("");}}>Reset</Button>
              <Button onClick={exportCSV}><Download className="size-4 mr-2"/>Export CSV</Button>
            </div>

            <Separator />

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Year & Section</TableHead>
                    <TableHead>Tomorrow's Choice</TableHead>
                    <TableHead>Notion</TableHead>
                    <TableHead>Strikes</TableHead>
                    <TableHead>Last Submission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p)=> (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.year}-{p.section}</TableCell>
                      <TableCell>{p.choiceLabel}</TableCell>
                      <TableCell>{p.notion? "Y":"N"}</TableCell>
                      <TableCell>{p.strikes}</TableCell>
                      <TableCell className="whitespace-nowrap">{new Date(p.lastSubmission).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TechShell>
  );
}