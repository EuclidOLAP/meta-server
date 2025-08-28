export interface User {
  user_name: string;
  pswd_hash: string;
  is_admin: boolean;
  created_at: Date;
  updated_at: Date;
  description?: string;
}
