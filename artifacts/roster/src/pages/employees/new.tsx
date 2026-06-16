import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateEmployee, useListDepartments, useListDesignations, getListEmployeesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  departmentId: z.coerce.number().optional(),
  designationId: z.coerce.number().optional(),
  status: z.string().default("active"),
  employmentType: z.string().default("full_time"),
  hireDate: z.string().min(1, "Hire date is required"),
});

export default function NewEmployeePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: departments } = useListDepartments();
  const { data: designations } = useListDesignations();
  
  const createEmployee = useCreateEmployee();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      status: "active",
      employmentType: "full_time",
      hireDate: new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createEmployee.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          toast({ title: "Employee created successfully" });
          setLocation(`/app/employees/${data.id}`);
        },
        onError: (error: any) => {
          toast({ 
            title: "Failed to create employee", 
            description: error.message || "Please check the form for errors",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-3xl mx-auto pb-12">
        <div className="flex items-center gap-4">
          <Link href="/app/employees">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Add New Employee</h1>
            <p className="text-muted-foreground mt-1">Create a new record in the team directory.</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">01. Personal Information</CardTitle>
                <CardDescription>Basic contact and identification details</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-serif">02. Employment Details</CardTitle>
                <CardDescription>Role, department, and employment status</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(parseInt(val, 10))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments?.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id.toString()}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="designationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(parseInt(val, 10))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a designation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {designations?.map((desig) => (
                            <SelectItem key={desig.id} value={desig.id.toString()}>
                              {desig.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="employmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employment Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full_time">Full Time</SelectItem>
                          <SelectItem value="part_time">Part Time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="intern">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hire Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Link href="/app/employees">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={createEmployee.isPending}>
                {createEmployee.isPending ? "Creating..." : "Create Employee Record"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
