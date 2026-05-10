DROP TRIGGER IF EXISTS trg_activate_subscription_on_approval ON public.payment_requests;

CREATE TRIGGER trg_activate_subscription_on_approval
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.activate_subscription_on_approval();

DROP TRIGGER IF EXISTS trg_pr_updated ON public.payment_requests;

CREATE TRIGGER trg_pr_updated
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();