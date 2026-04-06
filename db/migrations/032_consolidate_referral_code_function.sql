-- Migration: 032_consolidate_referral_code_function.sql
-- Description: Consolidate duplicate generate_referral_code() functions
-- Uses the simpler MD5-based implementation from 010b_role_improvements_part2.sql
-- Date: 2024

-- Drop the more complex version from 018_referral_system.sql and keep the simpler one
DROP FUNCTION IF EXISTS generate_referral_code();

-- Recreate with canonical simpler implementation
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(50) AS $$
DECLARE
    v_code VARCHAR(50);
BEGIN
    LOOP
        v_code := 'REF' || UPPER(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = v_code);
    END LOOP;
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_referral_code() IS 'Generates unique referral codes for users - canonical implementation';
