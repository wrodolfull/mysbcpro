-- Function to create organization when user signs up
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    org_name text;
    tenant_id text;
    org_id uuid;
BEGIN
    -- Extract organization name from user metadata
    org_name := NEW.raw_user_meta_data->>'org_name';
    
    -- Only create organization if org_name is provided
    IF org_name IS NOT NULL AND org_name != '' THEN
        -- Generate tenant ID
        tenant_id := 'tenant_' || lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '_', 'g')) || '_' || extract(epoch from now())::bigint;
        
        -- Insert organization
        INSERT INTO public.organizations (
            name,
            admin_email,
            freeswitch_tenant_id,
            blocked
        ) VALUES (
            org_name,
            NEW.email,
            tenant_id,
            false
        ) RETURNING id INTO org_id;
        
        -- Update user metadata with organization_id
        UPDATE auth.users 
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('organization_id', org_id::text)
        WHERE id = NEW.id;
        
        -- Log the creation
        RAISE NOTICE 'Organization created: % (ID: %) for user: %', org_name, org_id, NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON TABLE public.organizations TO postgres;

COMMENT ON FUNCTION handle_new_user_signup() IS 'Automatically creates organization when user signs up with org_name in metadata';
